"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import styles from "./header.module.css"

const Links = ({ isMobile }) => {
  const pathname = usePathname()



  const links = [
    "Home",
    "Sports",
    "Catalog",
    "TV",
    "AI",
  ]

  if (isMobile) {
    return (
      <div className="flex flex-col h-full justify-between items-center  text-[#c4c2c7] p-2 gap-1 overflow-hidden ">
        {links.map((link, index) => {
          let href = "/"
          if (link === "Home") href = "/"
          else if (link === "TV") href = "/catalog"
          else href = `/${link.toLowerCase()}`

          return (
            <Link
              href={href}
              key={link}
              className={`${(pathname === "/" ? "Home" : pathname).includes(link === "TV" ? "catalog" : link.toLowerCase()) ? "text-white bg-[#242233] border-2 border-[#313e5038]" : ""}  w-full h-full text-center py-[6px] rounded-md hover:bg-[#242233] border-2 border-transparent hover:border-[#313e5038] relative ${styles.animate_ltr}`}
              style={{ animationDelay: `${index * 0.13}s` }}
            >
              {link}
            </Link>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex mt-[8px] text-[#c4c2c7] max-[990px]:hidden">
      {links.map((link, index) => {
        let href = "/"
        if (link === "Home") href = "/"
        else if (link === "TV") href = "/catalog"
        else href = `/${link.toLowerCase()}`

        return (
          <Link
            href={href}
            key={link}
            className={`${index === 0 ? "ml-6" : "ml-4"} ${(pathname === "/" ? "home" : pathname).includes(link === "TV" ? "catalog" : link.toLowerCase()) ? "text-white" : ""}`}
          >
            {link}
          </Link>
        )
      })}
    </div>
  )
}

export default Links;
