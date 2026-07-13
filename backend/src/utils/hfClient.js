const { Client, handle_file } = require("@gradio/client");

async function callGradioApi(imagePath) {
  try {
    const client = await Client.connect("HugoBranche/plantdiagnose-api");

    const result = await client.predict("/predict", {
      image: handle_file(imagePath),
    });
    console.log(result);

    // Gradio v2.x returns the prediction in result.data
    const output = Array.isArray(result.data)
      ? result.data[0]
      : result.data;

    return parseDiagnosis(output);

  } catch (err) {
    console.error(err);
    throw new Error(`Failed to connect to Hugging Face: ${err.message}`);
  }
}

function parseDiagnosis(text) {

  if (typeof text !== "string") {
    throw new Error("Unexpected response returned from Hugging Face.");
  }

  const diagnosis = {};

  text.split("\n").forEach(line => {

    const parts = line.split(":");

    if (parts.length < 2) return;

    const key = parts.shift().trim().toLowerCase();

    const value = parts.join(":").trim();

    diagnosis[key] = value;

  });

  return {
    plant: diagnosis.plant || "Unknown",
    condition: diagnosis.condition || "Unknown",
    status: diagnosis.status || "Unknown",
    confidence: parseFloat(
      (diagnosis.confidence || "0").replace("%", "")
    ) || 0
  };
}

module.exports = {
  callGradioApi
};