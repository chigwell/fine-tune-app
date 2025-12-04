import React from "react";

const SidebarCard = () => {
  return (
    <div className="flex h-fit w-full flex-col rounded-[20px] bg-gradient-to-br from-brandLinear to-brand-500 pb-4">
      <div className="mt-3 px-8">
        <h4 className="text-xl font-bold text-white">Horizon UI PRO</h4>
        <p className="mt-[3px] text-sm text-white">
          Access all Components in Horizon UI PRO!
        </p>
      </div>
      <button className="linear mt-10 w-full rounded-xl bg-white py-2 text-base font-bold text-brand-500 transition duration-200 hover:bg-gray-100">
        Try Horizon PRO
      </button>
    </div>
  );
};

export default SidebarCard;
