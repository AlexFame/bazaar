import ChatWindowClient from "@/components/ChatWindowClient";

export const metadata = {
  title: "Чат | Bazaar",
};

export default function ChatPage({ params }) {
  return <ChatWindowClient conversationId={params.id} />;
}
