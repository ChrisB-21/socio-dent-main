                                                                                             import React from "react";

export default function WhatsAppBubble() {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center">
      <div className="mr-4 bg-white rounded-lg px-6 py-3 shadow-lg text-gray-600 text-base font-medium relative">
        +91 904 356 1043
        <div className="absolute right-[-8px] top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-[8px] border-l-white border-y-[6px] border-y-transparent"></div>
      </div>
      <a
        href="https://wa.me/919043561043"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp"
        className="w-16 h-16 rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-300"
      >
        <img
          src="/whatsapp-logo.png"
          alt="WhatsApp"
          className="w-14 h-14"
        />
      </a>
    </div>
  );
}
