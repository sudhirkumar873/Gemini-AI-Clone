import { useState, useRef } from "react";
import axios from "axios";
import SavedMessages from "./SavedMessage";
import { HiMenuAlt1 } from "react-icons/hi";

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [responseData, setResponseData] = useState(null);
  const [displayedResponse, setDisplayedResponse] = useState("");
  const [displayedSummary, setDisplayedSummary] = useState("");
  const inputRef = useRef(null);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);
  const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen);

  const typeText = (text, setStateCallback, callback) => {
    let index = 0;
    setStateCallback("");
    const interval = setInterval(() => {
      setStateCallback((prev) => prev + text.charAt(index));
      index++;
      if (index >= text.length) {
        clearInterval(interval);
        if (callback) callback();
      }
    }, 50);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      alert("Please enter a search query.");
      return;
    }

    setIsLoading(true);
    setDisplayedResponse("");
    setDisplayedSummary("");
    setResponseData(null);

    try {
      const response = await axios.post("http://localhost:5000/api/chat", {
        userMessage: searchQuery,
      });

      const { botReply, summary } = response.data;
      setResponseData(response.data);

      typeText(botReply, setDisplayedResponse, () => {
        typeText(summary, setDisplayedSummary);
      });

    } catch (error) {
      console.error("Error making API request:", error);
      alert('❌ Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen">
      <button
        onClick={openModal}
        className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 transition"
      >
        Open Modal
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 w-[1000px] h-[700px] relative overflow-hidden">
            <button
              onClick={toggleDrawer}
              className="absolute top-4 left-4 text-gray-700 hover:text-gray-900"
            >
              <HiMenuAlt1 size={30} />
            </button>

            <div className={`absolute top-0 left-0 h-full bg-white shadow-lg transition-transform ${isDrawerOpen ? "translate-x-0" : "-translate-x-full"} w-64 z-20 overflow-y-auto max-h-screen`}>
              <button
                onClick={toggleDrawer}
                className="absolute top-4 right-4 text-gray-700 hover:text-gray-900"
              >
                ✕
              </button>
              <SavedMessages />
            </div>

            <div className={`flex-1 transition-all duration-300 ${isDrawerOpen ? 'ml-64' : ''} pl-8 overflow-y-auto`}>
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
              >
                ✕
              </button>

              <input
                ref={inputRef}
                type="text"
                placeholder="Search with the Chatbot..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-[50px] p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <button
                onClick={handleSearch}
                className={`w-full py-3 bg-black text-white font-bold rounded-md ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={isLoading}
              >
                {isLoading ? "Searching..." : "Search"}
              </button>

              <div className="mt-6 p-4 bg-gray-100 rounded-md h-48 overflow-y-auto">
                <h2 className="text-xl font-semibold">Response:</h2>
                <pre className="mt-4 text-gray-800 whitespace-pre-wrap">
                  {displayedResponse || (isLoading && <span>Loading response...</span>)}
                </pre>
              </div>


              <div className="mt-6 p-4 bg-yellow-100 rounded-md h-48 overflow-y-auto">
                <h2 className="text-xl font-semibold">Summary:</h2>
                <pre className="mt-4 text-gray-800 whitespace-pre-wrap">
                  {displayedSummary || (isLoading && <span>Loading response...</span>)}
                </pre>
              </div>


            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
