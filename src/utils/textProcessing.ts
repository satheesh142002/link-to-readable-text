
// Extract text content from HTML
export const extractTextFromHtml = (html: string): string => {
  // Create a DOM parser and parse the HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove script and style elements to avoid extracting their content
  const scripts = doc.querySelectorAll('script, style, nav, footer, header, [role="navigation"], .sidebar, .menu, .ad, .advertisement, .cookie, .popup');
  scripts.forEach(script => script.remove());

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
    '.post-content'
  ];
  
  let mainContent = '';
  
  // Try to extract from main content areas first
  for (const selector of contentSelectors) {
    const elements = doc.querySelectorAll(selector);
    if (elements.length > 0) {
      elements.forEach(el => {
        mainContent += el.textContent + '\n\n';
      });
      break;
    }
  }
  
  // If no main content was found, extract from body
  if (!mainContent.trim()) {
    const paragraphs = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
    paragraphs.forEach(p => {
      const text = p.textContent?.trim();
      if (text && text.length > 20) { // Only include substantial paragraphs
        mainContent += text + '\n\n';
      }
    });
  }
  
  // If still no content, just take everything from body
  if (!mainContent.trim()) {
    mainContent = doc.body.textContent || '';
  }
  
  return mainContent;
};

// Clean and format the extracted text
export const cleanText = (text: string): string => {
  return text
    // Replace multiple new lines with just two
    .replace(/\n{3,}/g, '\n\n')
    // Replace multiple spaces with a single space
    .replace(/[ \t]+/g, ' ')
    // Remove empty lines
    .replace(/^\s*[\r\n]/gm, '')
    // Trim the text
    .trim();
};
