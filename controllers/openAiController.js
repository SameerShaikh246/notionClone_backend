import { OpenAI } from "openai";

const openaiApiKey =
  process.env.OPENAI_API_KEY ||
  "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";
const openai = new OpenAI({
  apiKey: openaiApiKey,
});
export const grammarController = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).send({
        message: "Please enter a valid text.",
        success: false,
      });
    }
    // const openaiInstance = new OpenAI(openaiApiKey);

    const data = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You will be provided with statements, and your task is to convert them to standard English.",
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.7,
      max_tokens: 64,
      top_p: 1,
    });
    console.log("text :", data);

    if (data && data.choices && data.choices.length > 0) {
      const correctedText = data.choices[0].message.content;

      return res.status(200).json({ correctedText });
    } else {
      throw new Error("Grammar correction failed");
    }
  } catch (err) {
    console.error(err);
    return "Error in grammar correction";
  }
};

// Example usage
// She no went to the market.
// He do not like grammar.

export const translateController = async (req, res) => {
  try {
    const { text, lang } = req.body;
    if (!text || !lang) {
      return res.status(404).send({
        message: "Please enter a valid text or language.",
        success: false,
      });
    }
    // const openaiInstance = new OpenAI(openaiApiKey);

    const data = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You will be provided with a sentence in English, and your task is to translate it into ${lang}.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.7,
      max_tokens: 64,
      top_p: 1,
    });
    console.log("text :", data);

    if (data && data.choices && data.choices.length > 0) {
      const translatedText = data.choices[0].message.content;

      return res.status(200).json({ translatedText });
    } else {
      throw new Error("Grammar correction failed");
    }
  } catch (err) {
    console.error(err);
    return "Error in grammar correction";
  }
};

export const autocompleteController = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res
        .status(400)
        .json({ message: "Please enter a valid text.", success: false });
    }
    const data = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You will be provided with a sentence in English, and your task is to give some suggestions regarding the rext for autocomplete 3 suggestions.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.7,
      max_tokens: 64,
      top_p: 1,
    });
    console.log("text :", data.choices);

    if (data && data.choices && data.choices.length > 0) {
      const autoCompletedSuggestions = data.choices[0].message.content;
      // Split the input string by newline character and remove any empty strings
      const lines = autoCompletedSuggestions
        .split("\n")
        .filter((line) => line.trim() !== "");
      // Map each line to an object with id and text properties
      const outputArray = lines.map((line) => {
        const [id, text] = line.split(". ");
        return { id: parseInt(id), text };
      });
      return res.status(200).send({ success: true, data: outputArray });
    } else {
      throw new Error("Autocompletion failed.");
    }
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Error in auto-complete suggestions", success: false });
  }
};
