import * as React from "react"

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number
}

export function Logo({ size = 24, className, ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M11 18.5C11 14.3579 14.3579 11 18.5 11H30.0858C31.5093 11 32.8668 11.6068 33.8148 12.668L38.3184 17.708C39.4634 18.9894 41.1022 19.7222 42.8205 19.7222H47.5C51.6421 19.7222 55 23.0801 55 27.2222V28.8333C55 32.9754 51.6421 36.3333 47.5 36.3333H36.7439C34.9977 36.3333 33.3416 37.0978 32.2007 38.424L27.795 43.5471C26.8458 44.6509 25.4606 45.2857 24.0047 45.2857H18.5C14.3579 45.2857 11 41.9279 11 37.7857V18.5Z"
        fill="currentColor"
        opacity="0.18"
      />
      <path
        d="M18.5 13H29.5601C30.9798 13 32.3342 13.6048 33.2815 14.6627L37.7864 19.6947C39.3102 21.3966 41.4862 22.3704 43.7701 22.3704H47.5C50.5376 22.3704 53 24.8328 53 27.8704V28.1852C53 31.2228 50.5376 33.6852 47.5 33.6852H36.5397C34.2491 33.6852 32.0669 34.6647 30.543 36.3752L26.0868 41.3767C25.139 42.4404 23.7832 43.0481 22.361 43.0481H18.5C15.4624 43.0481 13 40.5857 13 37.5481V18.5C13 15.4624 15.4624 13 18.5 13Z"
        stroke="currentColor"
        strokeWidth="2.4"
      />
      <path
        d="M22 28.5H30.5"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M22 34.5H41"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M41.5 13L47.5 19"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <circle cx="45.5" cy="44.5" r="5.5" fill="currentColor" />
      <path
        d="M43.2 44.3L45.1 46.2L48.3 42.7"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
