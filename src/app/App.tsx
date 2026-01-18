import "@/styles/fonts.css";
import { Sidebar } from "./components/Sidebar";
import { ChatArea } from "./components/ChatArea";

export default function App() {
  return (
    <div className="flex w-full h-screen overflow-hidden font-sans text-[#1f1a14]">
      <Sidebar />
      <ChatArea />
    </div>
  );
}
