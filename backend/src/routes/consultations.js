const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { calculateUpdatedBotanistRating } = require("../utils/reviewUtils");

const router = express.Router();

// Resolves the botanist card id format ("u-12") used on the Nearby
// Botanists page into a real user id.
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
      return res.status(400).json({ error: "Please select a real botanist account." });
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

    const otherUserId = consultation.toBotanistUserId === req.userId ? consultation.fromUserId : consultation.toBotanistUserId;
    const otherUser = await db.users.findById(otherUserId);

    res.json({
      consultation: {
        id: consultation.id,
        status: consultation.status,
        canReview: consultation.fromUserId === req.userId && otherUser?.role === "botanist",
      },
      messages: thread,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Could not load messages." });
  }
});

// POST /api/consultations/:id/review — allow a farmer to review a botanist after a conversation.
router.post("/:id/review", requireAuth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const numericRating = Number(rating);

    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ error: "A rating between 1 and 5 is required." });
    }

    const consultation = await db.consultations.findByIdForUser(req.params.id, req.userId);
    if (!consultation) return res.status(404).json({ error: "Conversation not found." });
    if (consultation.fromUserId !== req.userId) {
      return res.status(403).json({ error: "Only the person who started the conversation can leave a review." });
    }

    const botanist = await db.users.findById(consultation.toBotanistUserId);
    if (!botanist || botanist.role !== "botanist") {
      return res.status(404).json({ error: "Botanist not found." });
    }

    const { rating: nextRating, reviews: nextReviews } = calculateUpdatedBotanistRating(
      botanist.rating,
      botanist.reviews,
      numericRating
    );

    const updatedBotanist = await db.users.update(consultation.toBotanistUserId, {
      rating: nextRating,
      reviews: nextReviews,
    });

    if (updatedBotanist) {
      await db.botanists.upsertForUser(updatedBotanist);
    }

    res.status(201).json({
      success: true,
      rating: nextRating,
      reviews: nextReviews,
      message: `Thanks for your ${numericRating}-star review${comment ? " and note" : ""}.`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Could not submit review." });
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