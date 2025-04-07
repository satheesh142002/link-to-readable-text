
// Extract text content from HTML
export const extractTextFromHtml = (html: string): string => {
  try {
    // Check if we have HTML content
    if (!html || typeof html !== 'string') {
      console.error("Invalid HTML content received");
      return "";
    }
    
    console.log("Parsing HTML content...");
    
    // Create a DOM parser and parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove script and style elements to avoid extracting their content
    const elementsToRemove = doc.querySelectorAll(
      'script, style, nav, footer, header, [role="navigation"], .sidebar, .menu, ' +
      '.ad, .advertisement, .cookie, .popup, iframe, noscript, ' +
      '[class*="banner"], [class*="ad-"], [id*="ad-"], [class*="cookie"], ' +
      '[class*="newsletter"], [class*="social"], [class*="sharing"]'
    );
    elementsToRemove.forEach(element => element.remove());
    
    console.log("Removed unnecessary elements, extracting content...");

    // Extract content from main content areas
    const contentSelectors = [
      'article', 
      'main', 
      '[role="main"]', 
      '.content', 
      '.post', 
      '.entry', 
      '#content',
      '.article-content',
      '.post-content',
      '.page-content',
      '.entry-content',
      '[itemprop="articleBody"]',
      '.story',
      '.blog-post',
      '.news-article'
    ];
    
    let mainContent = '';
    
    // Try to extract from main content areas first
    for (const selector of contentSelectors) {
      const elements = doc.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`Found content using selector: ${selector}`);
        elements.forEach(el => {
          mainContent += el.textContent + '\n\n';
        });
        break;
      }
    }
    
    // If no main content was found, extract from body
    if (!mainContent.trim()) {
      console.log("No main content found, extracting from paragraphs...");
      // First try to get text from paragraphs and headings
      const paragraphs = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, code, dt, dd');
      paragraphs.forEach(p => {
        const text = p.textContent?.trim();
        if (text && text.length > 10) { // Only include substantial paragraphs
          mainContent += text + '\n\n';
        }
      });
      
      // If still no content, get text from div elements that likely contain content
      if (!mainContent.trim()) {
        console.log("No paragraphs found, extracting from divs...");
        const divs = Array.from(doc.querySelectorAll('div')).filter(div => {
          const text = div.textContent?.trim();
          return text && text.length > 100 && div.children.length < 5;
        });
        
        divs.forEach(div => {
          mainContent += div.textContent + '\n\n';
        });
      }
    }
    
    // If still no content, just take everything from body
    if (!mainContent.trim()) {
      console.log("No structured content found, taking all body content");
      mainContent = doc.body.textContent || '';
    }
    
    console.log(`Extracted content length: ${mainContent.length} characters`);
    
    return mainContent;
  } catch (error) {
    console.error('Error extracting HTML:', error);
    return 'Could not extract text from this page. The content may be protected or in an unsupported format.';
  }
};

// Clean and format the extracted text
export const cleanText = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return 'No text content could be extracted from this URL.';
  }
  
  return text
    // Replace multiple new lines with just two
    .replace(/\n{3,}/g, '\n\n')
    // Replace multiple spaces with a single space
    .replace(/[ \t]+/g, ' ')
    // Remove empty lines
    .replace(/^\s*[\r\n]/gm, '')
    // Remove common web page noise phrases
    .replace(/cookie policy|privacy policy|terms of service|all rights reserved/gi, '')
    // Clean up leftover whitespace
    .replace(/\s{2,}/g, ' ')
    // Trim the text
    .trim();
};
