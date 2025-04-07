
import { extractTextFromHtml, cleanText } from '../utils/textProcessing';

// Function to convert any link to readable text
export const convertLinkToText = async (url: string): Promise<{ text: string; title: string }> => {
  try {
    // Ensure the URL is properly formatted
    const formattedUrl = formatUrl(url);
    
    // Try multiple proxy methods in sequence
    try {
      // First attempt with AllOrigins proxy
      return await fetchWithProxy(`https://api.allorigins.win/raw?url=${encodeURIComponent(formattedUrl)}`);
    } catch (error) {
      console.log("First proxy failed, trying alternate proxy...");
      try {
        // Second attempt with CORS Anywhere proxy
        return await fetchWithProxy(`https://cors-anywhere.herokuapp.com/${formattedUrl}`);
      } catch (error) {
        console.log("Second proxy failed, trying direct fetch with no-cors...");
        // Third attempt without proxy but with no-cors mode
        return await fetchWithProxy(formattedUrl, { mode: 'no-cors' });
      }
    }
  } catch (error) {
    console.error('Error in convertLinkToText:', error);
    throw new Error('Failed to convert link to text. Please try a different link or try again later.');
  }
};

// Function to fetch content with a given proxy URL
const fetchWithProxy = async (proxyUrl: string, options = {}): Promise<{ text: string; title: string }> => {
  const response = await fetch(proxyUrl, options);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch content: ${response.status} ${response.statusText}`);
  }
  
  try {
    const html = await response.text();
    
    // Extract title from HTML
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : "Extracted Content";
    
    // Extract and clean the text content
    const extractedText = extractTextFromHtml(html);
    const cleanedText = cleanText(extractedText);
    
    return { text: cleanedText, title };
  } catch (error) {
    console.error("Error processing HTML:", error);
    throw new Error("Could not process the webpage content");
  }
};

// Helper function to ensure URL has proper protocol
const formatUrl = (url: string): string => {
  // Handle special cases for links that might need different treatment
  if (url.includes('twitter.com') || url.includes('x.com')) {
    // Twitter/X might need special handling
    console.log("Twitter link detected, using special handling");
  } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
    // YouTube might need special handling
    console.log("YouTube link detected, using special handling");
  }
  
  // Ensure URL has proper protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
};

