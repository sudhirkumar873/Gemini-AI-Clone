import React, { useEffect, useState } from 'react';
import axios from 'axios';

const SavedMessages = () => {
  const [savedMessages, setSavedMessages] = useState([]);
  const [expandedMessages, setExpandedMessages] = useState({}); // Track expanded state for each message

  useEffect(() => {
    const fetchSavedMessages = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/messages1');
        setSavedMessages(response.data.messages);
      } catch (error) {
        console.error('Error fetching saved messages:', error);
      }
    };

    fetchSavedMessages();
  }, []);

  // Toggle expanded state for a specific message
  const toggleExpand = (messageId) => {
    setExpandedMessages((prevState) => ({
      ...prevState,
      [messageId]: !prevState[messageId], // Toggle the state for the current message
    }));
  };

  return (
    <aside className="w-64 bg-gray-50 shadow-inner border-r border-gray-200 p-2 overflow-y-auto h-full">
      <h3 className="font-semibold text-xl mb-4">History</h3>
      <ul className="space-y-4">
        {savedMessages.map((message) => (
          <li key={message._id} className="border rounded-lg p-4 bg-white">
            <h3 className="font-bold text-lg">{message.userMessage}</h3>
            
            {/* Bot reply with "Show more/less" toggle */}
            <p 
              className={`text-gray-700 ${
                expandedMessages[message._id] ? '' : 'line-clamp-4'
              } overflow-hidden`}
            >
              {message.botReply}
            </p>

            <button
              onClick={() => toggleExpand(message._id)}
              className="text-blue-500 text-sm mt-2 hover:underline"
            >
              {expandedMessages[message._id] ? 'Show Less' : 'Expand More'}
            </button>

            <span className="text-gray-500 text-sm block mt-2">
              {new Date(message.createdAt).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default SavedMessages;
