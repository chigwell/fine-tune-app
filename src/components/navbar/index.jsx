import React from "react";
import Dropdown from "components/dropdown";
import { FiAlignJustify } from "react-icons/fi";
import { Link } from "react-router-dom";
import { BsArrowBarUp } from "react-icons/bs";
import { RiMoonFill, RiSunFill } from "react-icons/ri";
import { IoMdNotificationsOutline } from "react-icons/io";
import avatar from "assets/img/avatars/avatar4.png";
import { useAuth } from "context/AuthContext";

const Navbar = (props) => {
  const { onOpenSidenav, brandText } = props;
  const [darkmode, setDarkmode] = React.useState(false);
  const { email, logout } = useAuth();

  return (
    <nav className="sticky top-4 z-40 flex flex-row flex-wrap items-center justify-between rounded-xl bg-white/10 p-2 backdrop-blur-xl dark:bg-[#0b14374d]">
      <div className="flex w-full flex-row items-center justify-between">
        <div className="ml-[6px]">
          <div className="h-6 w-[224px] pt-1">
            <a
              className="text-sm font-normal text-navy-700 hover:underline dark:text-white dark:hover:text-white"
              href=" "
            >
              Pages
              <span className="mx-1 text-sm text-navy-700 hover:text-navy-700 dark:text-white">
                {" "}
                /{" "}
              </span>
            </a>
            <Link
              className="text-sm font-normal capitalize text-navy-700 hover:underline dark:text-white dark:hover:text-white"
              to="#"
            >
              {brandText}
            </Link>
          </div>
          <p className="shrink text-[33px] capitalize text-navy-700 dark:text-white">
            <Link
              to="#"
              className="font-bold capitalize hover:text-navy-700 dark:hover:text-white"
            >
              {brandText}
            </Link>
          </p>
        </div>

        <div className="relative mt-[3px] flex h-[61px] items-center gap-2 rounded-full bg-white px-2 py-2 shadow-xl shadow-shadow-500 dark:!bg-navy-800 dark:shadow-none md:gap-2 xl:gap-2">
          <span
            className="flex cursor-pointer text-xl text-gray-600 dark:text-white xl:hidden mr-auto"
            onClick={onOpenSidenav}
          >
            <FiAlignJustify className="h-5 w-5" />
          </span>
          <div className="flex items-center">
            <p style={{paddingLeft: "12px"}} className="text-xl font-bold text-navy-700 dark:text-white">$100.00</p>
          </div>
          {/* start Notification */}
          <Dropdown
            button={
              <p style={{paddingLeft: "8px"}} className="cursor-pointer">
                <IoMdNotificationsOutline className="h-4 w-4 text-gray-600 dark:text-white" />
              </p>
            }
            animation="origin-[65%_0%] md:origin-top-right transition-all duration-300 ease-in-out"
            children={
              <div className="flex w-[360px] flex-col gap-3 rounded-[20px] bg-white p-4 shadow-xl shadow-shadow-500 dark:!bg-navy-700 dark:text-white dark:shadow-none sm:w-[460px]">
                <div className="flex items-center justify-between">
                  <p className="text-base font-bold text-navy-700 dark:text-white">
                    Notification
                  </p>
                  <p className="text-sm font-bold text-navy-700 dark:text-white">
                    Mark all read
                  </p>
                </div>

                <button className="flex w-full items-center">
                  <div className="flex h-full w-[85px] items-center justify-center rounded-xl bg-gradient-to-b from-brandLinear to-brand-500 py-4 text-2xl text-white">
                    <BsArrowBarUp />
                  </div>
                  <div className="ml-2 flex h-full w-full flex-col justify-center rounded-lg px-1 text-sm">
                    <p className="mb-1 text-left text-base font-bold text-gray-900 dark:text-white">
                      New Update: Horizon UI Dashboard PRO
                    </p>
                    <p className="font-base text-left text-xs text-gray-900 dark:text-white">
                      A new update for your downloaded item is available!
                    </p>
                  </div>
                </button>

                <button className="flex w-full items-center">
                  <div className="flex h-full w-[85px] items-center justify-center rounded-xl bg-gradient-to-b from-brandLinear to-brand-500 py-4 text-2xl text-white">
                    <BsArrowBarUp />
                  </div>
                  <div className="ml-2 flex h-full w-full flex-col justify-center rounded-lg px-1 text-sm">
                    <p className="mb-1 text-left text-base font-bold text-gray-900 dark:text-white">
                      New Update: Horizon UI Dashboard PRO
                    </p>
                    <p className="font-base text-left text-xs text-gray-900 dark:text-white">
                      A new update for your downloaded item is available!
                    </p>
                  </div>
                </button>
              </div>
            }
            classNames={"py-2 top-4 -left-[230px] md:-left-[440px] w-max"}
          />
          
          <div
            style={{paddingLeft: "8px", paddingRight: "8px"}}
            className="cursor-pointer text-gray-600"
            onClick={() => {
              if (darkmode) {
                document.body.classList.remove("dark");
                setDarkmode(false);
              } else {
                document.body.classList.add("dark");
                setDarkmode(true);
              }
            }}
          >
            {darkmode ? (
              <RiSunFill className="h-4 w-4 text-gray-600 dark:text-white" />
            ) : (
              <RiMoonFill className="h-4 w-4 text-gray-600 dark:text-white" />
            )}
          </div>
          {/* Profile & Dropdown */}
          <Dropdown
            button={
              <img
                className="h-10 w-10 rounded-full"
                src={avatar}
                alt="Profile avatar"
              />
            }
            children={
              <div className="flex w-56 flex-col justify-start rounded-[20px] bg-white bg-cover bg-no-repeat shadow-xl shadow-shadow-500 dark:!bg-navy-700 dark:text-white dark:shadow-none">
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-navy-700 dark:text-white">
                      👋 Hey{email ? "," : ""} {email || "there"}
                    </p>
                  </div>
                </div>
                <div className="h-px w-full bg-gray-200 dark:bg-white/20 " />

                <div className="flex flex-col p-4">
                  <button
                    onClick={logout}
                    className="mt-3 text-left text-sm font-medium text-red-500 transition duration-150 ease-out hover:text-red-500 hover:ease-in"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            }
            classNames={"py-2 top-8 -left-[180px] w-max"}
          />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
