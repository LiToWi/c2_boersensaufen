import React from 'react';

// 1. Change type to ReactNode to accept variables/arrays
interface BierTextProps {
  children: React.ReactNode;
}

const BierText: React.FC<BierTextProps> = ({ children }) => {
  // 2. Flatten the children into a single string
  // This converts ["Hello ", "World"] into "Hello World"
  const text = React.Children.toArray(children).join('');

  // 3. Now run the split on the clean text string
  const parts = text.split(' ');

  return (
    <span>
      {parts.map((part, index) => {
        if (part.toLowerCase().includes("bier")) {
            part += " "
          return (
            <span key={index} className="font-bier">
              {part}
            </span>
          );
        }
        return part+" ";
      })}
    </span>
  );
};

export default BierText;