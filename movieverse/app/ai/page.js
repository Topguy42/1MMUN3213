import AIAssistant from "@/content/ai/AIAssistant"

// AI page component
export const metadata = {
  title: "AI Assistant — 1MMUN3 TV",
  description: "Fast, intelligent AI assistant with no login required.",
}

const AIPage = () => {
  return (
    <>
      <div className="w-full flex flex-col items-center z-10 relative min-h-screen">
        <AIAssistant />
      </div>

      <div className="fixed w-[138.33px] h-[82.25px] left-[1%] top-[2%] bg-[#92b7fc8f] blur-[200px]" />
      <div className="fixed w-[500px] h-[370.13px] right-[50%] bottom-[20%] bg-[#576683b4] blur-[215.03px] translate-x-[70%] z-0 rounded-full" />
    </>
  )
}

export default AIPage
