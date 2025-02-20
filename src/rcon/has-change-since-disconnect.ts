export function hasChangesIgnoringSinceDisconnect(str1: string, str2: string): boolean {
  // Helper function to process the "Recently Disconnected Players" section
  const preprocess = (input: string): string => {
    // Extract only the "Recently Disconnected Players" section
    const disconnectedSection = input.split('----- Recently Disconnected Players')[1] || '';

    // Remove lines that contain "Since Disconnect: XXm.XXs" (normalize the "Since Disconnect" field)
    return disconnectedSection.replace(/Since Disconnect: \d{2}m\.\d{2}s/g, '').trim();
  };

  // Preprocess the "Recently Disconnected Players" sections for both inputs
  const processedStr1 = preprocess(str1);
  const processedStr2 = preprocess(str2);

  // Compare the processed "Recently Disconnected Players" sections
  return processedStr1 !== processedStr2;
}
