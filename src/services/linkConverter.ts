
import { extractTextFromHtml, cleanText } from '../utils/textProcessing';

// Function to convert any link to readable text
export const convertLinkToText = async (url: string): Promise<{ text: string; title: string }> => {
  try {
    // Ensure the URL is properly formatted
    const formattedUrl = formatUrl(url);
    
    // Try multiple proxy methods in sequence
    try {
      // First attempt with AllOrigins proxy
      const result = await fetchWithProxy(`https://api.allorigins.win/raw?url=${encodeURIComponent(formattedUrl)}`);
      if (result.text) return result;
    } catch (error) {
      console.log("First proxy failed, trying alternate proxy...");
      try {
        // Second attempt with CORS Anywhere proxy
        const result = await fetchWithProxy(`https://cors-anywhere.herokuapp.com/${formattedUrl}`);
        if (result.text) return result;
      } catch (error) {
        console.log("Second proxy failed, trying third proxy...");
        try {
          // Third attempt with another proxy service
          const result = await fetchWithProxy(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(formattedUrl)}`);
          if (result.text) return result;
        } catch (error) {
          console.log("Third proxy failed, trying direct fetch...");
          // Last attempt without proxy but with no-cors mode
          return await fetchWithProxy(formattedUrl, { mode: 'no-cors' });
        }
      }
    }
    
    // If we reach here, all attempts failed
    throw new Error("All proxy attempts failed");
  } catch (error) {
    console.error('Error in convertLinkToText:', error);
    throw new Error('Failed to convert link to text. Please try a different link or try again later.');
  }
};

// Function to fetch content with a given proxy URL
const fetchWithProxy = async (proxyUrl: string, options = {}): Promise<{ text: string; title: string }> => {
  console.log(`Attempting to fetch with: ${proxyUrl}`);
  const response = await fetch(proxyUrl, options);
  
  // For no-cors mode, we may not get a proper response
  if (options && (options as RequestInit).mode === 'no-cors') {
    return {
      text: "This website's content could not be accessed directly. Please try a different URL.",
      title: "Access Restricted"
    };
  }
  
  if (!response.ok) {
    console.error(`Fetch failed with status: ${response.status}`);
    throw new Error(`Failed to fetch content: ${response.status} ${response.statusText}`);
  }
  
  try {
    const html = await response.text();
    
    if (!html || html.trim() === '') {
      console.log("Received empty response");
      return { 
        text: "The retrieved content was empty. Please try a different URL.", 
        title: "Empty Content" 
      };
    }
    
    // Extract title from HTML
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : "Extracted Content";
    
    // Extract and clean the text content
    const extractedText = extractTextFromHtml(html);
    const cleanedText = cleanText(extractedText);
    
    if (!cleanedText || cleanedText.trim() === '') {
      return { 
        text: "No readable text could be extracted from this URL.", 
        title 
      };
    }
    
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
