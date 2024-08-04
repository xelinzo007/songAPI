const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');
const yts = require('yt-search');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for CORS
app.use(cors());

// Middleware to parse JSON bodies
app.use(express.json());

// Function to validate if the input is a valid YouTube URL
function isValidYouTubeUrl(input) {
  try {
    const url = new URL(input);
    return url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com' || url.hostname === 'youtu.be';
  } catch (error) {
    return false;
  }
}

// Function to get audio format information from a YouTube URL
async function getAudioInfoFromUrl(url) {
  try {
    const output = await youtubedl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: ['referer:youtube.com', 'user-agent:googlebot']
    });

    // Find audio formats and sort them by quality
    const audioFormats = output.formats
      .filter(format => format.acodec !== 'none')
      .sort((a, b) => (b.abr || 0) - (a.abr || 0)); // Sort by audio bitrate

    if (audioFormats.length === 0) {
      throw new Error('No audio formats available');
    }

    // Return the best audio format
    return audioFormats[0];
  } catch (error) {
    console.error('Error getting audio info from URL:', error);
    throw error;
  }
}

// Function to search for a video and return audio info
async function getAudioInfoFromSearch(query) {
  try {
    const result = await yts(query);

    if (result.videos.length === 0) {
      throw new Error('No videos found');
    }

    const videoUrl = result.videos[0].url;
    return await getAudioInfoFromUrl(videoUrl);
  } catch (error) {
    console.error('Error getting audio info from search:', error);
    throw error;
  }
}

app.post('/audio', async (req, res) => {
  const { input } = req.body;

  if (!input) {
    return res.status(400).json({ error: 'Input parameter is required' });
  }

  try {
    let audioInfo;

    if (isValidYouTubeUrl(input)) {
      audioInfo = await getAudioInfoFromUrl(input);
    } else {
      audioInfo = await getAudioInfoFromSearch(input);
    }

    res.json(audioInfo);
  } catch (error) {
    console.error('Failed to retrieve audio information:', error);
    res.status(500).json({ error: 'Failed to retrieve audio information', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
