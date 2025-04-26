import { FC, CSSProperties } from "react";
import { useMediaQuery } from "react-responsive";

type HeaderProps = { onButtonClick: () => void; onIconClick: () => void };

export const Header: FC<HeaderProps> = ({ onButtonClick, onIconClick }) => {
  const isDesktop = useMediaQuery({ minWidth: 768 });

  const style: CSSProperties = {
    width: "100%",
    maxWidth:"100%" ,
    height: "100%",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#60a5fa",
    color: "#fff",
    fontSize: "1.5rem",
    fontWeight: 700,
    padding: "0 1.5rem",
    borderRadius: "0.25rem",
    boxShadow: "0 4px 6px rgba(0,0,0,.1)",
  };

  const logo: CSSProperties = {
    position: "absolute",
    left: "2rem",
    width: "2rem",
    height: "80%",
    objectFit: "contain",
    cursor: "pointer",
  };

  const button: CSSProperties = {
    backgroundColor: "transparent",
    color: "white",
    padding: "0.5rem 1rem",
    border: "none",
    cursor: "pointer",
    height: "90%",
    position: "relative",
  };

  return (
    <header style={style}>
      <img src="/owlnest/logo192.png" alt="logo" style={logo} onClick={onIconClick} />
      <button style={button} onClick={onButtonClick}>
        Pros &amp; Cons
      </button>
    </header>
  );
};
