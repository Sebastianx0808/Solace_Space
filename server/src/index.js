const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const textToSpeech = require("@google-cloud/text-to-speech");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager, FileState } = require("@google/generative-ai/server");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { exec } = require("child_process");
const util = require("util");


const execAsync = util.promisify(exec);

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;


const DEBUG = true;
const debugLog = (...args) => {
  if (DEBUG) {
    console.log("[DEBUG]", ...args);
  }
};

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const ttsClient = new textToSpeech.TextToSpeechClient({
  keyFilename: "./google-services.json",
});

const audioDir = path.join(__dirname, "audio");
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir);
}

const apiKey = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});


const languageVoices = {
  en: { languageCode: "en-US", voiceName: "en-US-Neural2-F" },
  de: { languageCode: "de-DE", voiceName: "de-DE-Neural2-F" },
  hi: { languageCode: "hi-IN", voiceName: "hi-IN-Neural2-D" },
  fr: { languageCode: "fr-FR", voiceName: "fr-FR-Neural2-A" },
  ta: { languageCode: "ta-IN", voiceName: "ta-IN-Neural2-A" },
  kn: { languageCode: "kn-IN", voiceName: "kn-IN-Neural2-A" },
  es: { languageCode: "es-ES", voiceName: "es-ES-Neural2-A" },
};


async function checkFFmpeg() {
  try {
    await execAsync("ffmpeg -version");
    return true;
  } catch (error) {
    console.warn("FFmpeg not found. Audio conversion will not be available.");
    return false;
  }
}


async function convertToProperMP3(inputPath) {
  const outputPath = inputPath.replace(".mp3", "_converted.mp3");

  try {
    await execAsync(
      `ffmpeg -y -i "${inputPath}" -acodec libmp3lame -b:a 128k "${outputPath}"`
    );
    debugLog(`Converted audio file to: ${outputPath}`);
    return outputPath;
  } catch (error) {
    debugLog(`FFmpeg conversion error: ${error.message}`);
    return inputPath;
  }
}


app.post("/api/audio", async (req, res) => {
  const { base64Audio, prompt } = req.body;

  debugLog("Received request with prompt:", prompt);
  debugLog("Audio data present:", !!base64Audio);

  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  
  if (!base64Audio) {
    try {
      const result = await model.generateContent([{ text: prompt }]);
      const responseText = result.response.text();
      return res.json({ text: responseText });
    } catch (error) {
      console.error("Gemini Text Error:", error);
      return res.status(500).json({ error: "Failed to process text request" });
    }
  }


  try {
    let cleanBase64 = base64Audio;
    if (base64Audio.includes(",")) {
      cleanBase64 = base64Audio.split(",")[1];
    }

    const ffmpegAvailable = await checkFFmpeg();

    const audioBuffer = Buffer.from(cleanBase64, "base64");
    const fileName = `audio_${uuidv4()}.mp3`;
    const filePath = path.join(audioDir, fileName);
    fs.writeFileSync(filePath, audioBuffer);
    debugLog(`Audio saved to ${filePath} (${audioBuffer.length} bytes)`);

    let processedFilePath = filePath;
    if (ffmpegAvailable) {
      processedFilePath = await convertToProperMP3(filePath);
      debugLog(`Using processed file: ${processedFilePath}`);
    }

    if (
      !fs.existsSync(processedFilePath) ||
      fs.statSync(processedFilePath).size === 0
    ) {
      throw new Error("Audio file processing failed or file is empty");
    }

    debugLog("Uploading file to Google AI...");
    const uploadResult = await fileManager.uploadFile(processedFilePath, {
      mimeType: "audio/mp3",
      displayName: path.basename(processedFilePath),
    });

    debugLog(`File uploaded as: ${uploadResult.file.uri}`);

    let file = await fileManager.getFile(uploadResult.file.name);
    let attempts = 0;
    const maxAttempts = 12;

    while (file.state === FileState.PROCESSING && attempts < maxAttempts) {
      debugLog(`Processing file... attempt ${attempts + 1}`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      file = await fileManager.getFile(uploadResult.file.name);
      attempts++;
    }

    if (file.state === FileState.FAILED) {
      throw new Error("Audio processing failed: " + (file.error || "Unknown error"));
    }

    if (file.state === FileState.PROCESSING) {
      throw new Error("Audio processing timed out after 60 seconds");
    }

    debugLog("Generating content with prompt:", prompt);
    const result = await model.generateContent([
      { text: prompt },
      {
        fileData: {
          fileUri: uploadResult.file.uri,
          mimeType: "audio/mp3",
        },
      },
    ]);

    const responseText = result.response.text();
    debugLog("Response received:", responseText);

    if (processedFilePath !== filePath && fs.existsSync(processedFilePath)) {
      fs.unlinkSync(processedFilePath);
    }

    res.json({
      text: responseText,
      success: true,
      fileInfo: {
        uri: uploadResult.file.uri,
        state: file.state,
      },
    });
  } catch (error) {
    console.error("Gemini Audio Error:", error);
    res.status(500).json({
      error: "Failed to process audio",
      details: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});


app.post("/api/tips", async (req, res) => {
    const { prompt, assessment } = req.body;

    if (!prompt || !assessment) {
      return res.status(400).json({ error: "Prompt and assessment are required" });
    }

    try {
      debugLog("Generating tips with prompt:", prompt);
      const result = await model.generateContent([{ text: prompt }]);
      let responseText = result.response.text().trim();

      
      responseText = responseText.replace(/```json|```/g, "").trim();

      
      debugLog("Raw AI Response:", responseText);

    
      const jsonParts = responseText.split(/\n\s*\n/).map(part => part.trim());

      
      if (jsonParts.length !== 2) {
        throw new Error(`Response does not contain exactly two JSON objects. Raw response:\n${responseText}`);
      }

      
      const tipsData = JSON.parse(jsonParts[0]);
      const youtubeData = JSON.parse(jsonParts[1]);

      
      if (!tipsData.tip || !tipsData.tricks || !tipsData.suggestions) {
        throw new Error("Invalid tips response format");
      }

      if (!Array.isArray(youtubeData) || youtubeData.length === 0) {
        throw new Error("Invalid YouTube response format");
      }

      res.json({
        tips: tipsData,
        youtube: youtubeData,
        success: true,
      });
    } catch (error) {
      console.error("Tips Generation Error:", error);
      res.status(500).json({
        error: "Failed to generate tips",
        details: error.message,
      });
    }
});


app.post("/api/tts", async (req, res) => {
  const { text, language } = req.body;
  if (!text || !language) {
    return res.status(400).json({ error: "Text and language are required" });
  }

  const voiceSettings = languageVoices[language];
  if (!voiceSettings) {
    return res.status(400).json({ error: "Unsupported language" });
  }

  try {
    const request = {
      input: { text },
      voice: {
        languageCode: voiceSettings.languageCode,
        name: voiceSettings.voiceName,
        ssmlGender: "FEMALE",
      },
      audioConfig: { audioEncoding: "MP3" },
    };
    const [response] = await ttsClient.synthesizeSpeech(request);
    const audioContent = response.audioContent; 
    res.set("Content-Type", "audio/mp3");
    res.send(audioContent);
  } catch (error) {
    console.error("TTS Error:", error);
    res.status(500).json({ error: "Failed to generate speech" });
  }
});


app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    apiKeyConfigured: !!process.env.GOOGLE_API_KEY,
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  debugLog(`Debug mode: ${DEBUG ? "ON" : "OFF"}`);
  debugLog(`Audio directory: ${audioDir}`);
});