const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Resolves the botanist card id format ("u-12") used on the Nearby
// Botanists page into a real user id. Demo/seed botanists (plain numeric
// ids like "3") have no real account and can't be messaged.
function resolveBotanistUserId(botanistId) {
  const match = String(botanistId).match(/^u-(\d+)$/);
  if (match) return Number(match[1]);

  const numericId = Number(botanistId);
  return Number.isInteger(numericId) && numericId > 0 ? numericId : null;
}

// POST /api/consultations — start a new conversation with a botanist.
router.post("/", requireAuth, async (req, res) => {
  try {
    const { botanistId, message, diagnosisId } = req.body;
    if (!botanistId || !message || !message.trim()) {
      return res.status(400).json({ error: "botanistId and message are required." });
    }

    const botanistUserId = resolveBotanistUserId(botanistId);
    if (!botanistUserId) {
      return res.status(400).json({ error: "This botanist is a demo profile and can't receive messages yet." });
    }

    const botanist = await db.users.findById(botanistUserId);
    if (!botanist || botanist.role !== "botanist") {
      return res.status(404).json({ error: "Botanist not found." });
    }
    if (botanistUserId === req.userId) {
      return res.status(400).json({ error: "You can't message yourself." });
    }

    const consultation = await db.consultations.create({
      fromUserId: req.userId,
      toBotanistUserId: botanistUserId,
      message: message.trim(),
      diagnosisId: diagnosisId || null,
    });

    res.status(201).json({ consultation });
  } catch (err) {
    res.status(500).json({ error: err.message || "Could not start conversation." });
  }
});

// GET /api/consultations — every conversation the logged-in user is part
// of, farmer or botanist side, newest activity first. Includes the other
// participant's name and a preview of the latest message for a list view.
router.get("/", requireAuth, async (req, res) => {
  try {
    const conversations = await db.consultations.findForUser(req.userId);

    const enriched = await Promise.all(
      conversations.map(async (c) => {
        const isMineAsSender = c.fromUserId === req.userId;
        const otherUserId = isMineAsSender ? c.toBotanistUserId : c.fromUserId;
        const [other, thread] = await Promise.all([
          db.users.findById(otherUserId),
          db.messages.findByConsultation(c.id),
        ]);
        const lastMessage = thread[thread.length - 1] || null;
        return {
          id: c.id,
          otherUserId,
          otherUserName: other?.name || "Unknown",
          status: c.status,
          diagnosisId: c.diagnosisId,
          lastMessageAt: c.lastMessageAt,
          lastMessagePreview: lastMessage?.body || c.message,
          lastMessageFromMe: lastMessage?.senderId === req.userId,
        };
      })
    );

    res.json({ conversations: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message || "Could not load conversations." });
  }
});

// GET /api/consultations/:id/messages — full thread for one conversation.
router.get("/:id/messages", requireAuth, async (req, res) => {
  try {
    const consultation = await db.consultations.findByIdForUser(req.params.id, req.userId);
    if (!consultation) return res.status(404).json({ error: "Conversation not found." });

    const thread = await db.messages.findByConsultation(consultation.id);

    // Opening the thread as the recipient botanist marks it read.
    if (consultation.toBotanistUserId === req.userId && consultation.status === "new") {
      await db.consultations.updateStatus(consultation.id, "read");
    }

    res.json({
      consultation: { id: consultation.id, status: consultation.status },
      messages: thread,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Could not load messages." });
  }
});

// POST /api/consultations/:id/messages — send a reply, either participant.
router.post("/:id/messages", requireAuth, async (req, res) => {
  try {
    const { body } = req.body;
    if (!body || !body.trim()) {
      return res.status(400).json({ error: "Message body is required." });
    }

    const consultation = await db.consultations.findByIdForUser(req.params.id, req.userId);
    if (!consultation) return res.status(404).json({ error: "Conversation not found." });

    const message = await db.messages.create({
      consultationId: consultation.id,
      senderId: req.userId,
      body: body.trim(),
    });

    // A botanist replying counts as having responded.
    if (consultation.toBotanistUserId === req.userId) {
      await db.consultations.updateStatus(consultation.id, "responded");
    }

    res.status(201).json({ message });
  } catch (err) {
    res.status(500).json({ error: err.message || "Could not send message." });
  }
});

module.exports = router;