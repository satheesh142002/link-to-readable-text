
import { extractTextFromHtml, cleanText } from '../utils/textProcessing';

// Function to convert any link to readable text
export const convertLinkToText = async (url: string): Promise<{ text: string; title: string }> => {
  try {
    // Ensure the URL is properly formatted
    const formattedUrl = formatUrl(url);
    
    // Use a proxy to avoid CORS issues
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(formattedUrl)}`;
    
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch content: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Extract title from HTML
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : "Extracted Content";
    
    // Extract and clean the text content
    const extractedText = extractTextFromHtml(html);
    const cleanedText = cleanText(extractedText);
    
    return { text: cleanedText, title };
  } catch (error) {
    console.error('Error in convertLinkToText:', error);
    throw new Error('Failed to convert link to text. Please try a different link or try again later.');
  }
};

// Helper function to ensure URL has proper protocol
const formatUrl = (url: string): string => {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
};
