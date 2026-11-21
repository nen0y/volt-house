"use client";

export default function MobileLeadBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[45] border-t border-gray-200 bg-white/95 p-[10px] pb-[max(10px,env(safe-area-inset-bottom))] shadow-[0_-8px_28px_rgba(15,23,42,0.12)] backdrop-blur lg:hidden">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("e-kit:open-consultation"))}
        className="min-h-[50px] w-full rounded-[10px] bg-[#FFC107] px-[20px] text-[16px] font-bold text-gray-950"
      >
        Безкоштовно підібрати систему
      </button>
    </div>
  );
}
