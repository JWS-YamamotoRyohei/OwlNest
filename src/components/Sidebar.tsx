import { FC, CSSProperties } from "react";

type SidebarProps = {
    onClose: () => void;
};
export const sidebarWidth = "11rem"; 

const sidebarStyle: CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: sidebarWidth,
    height: "100%",
    backgroundColor: "#ffffff",
    boxShadow: "0 4px 6px rgba(0,0,0,.1)",
    overflowY: "auto",
    padding: "1rem",
};

const closeButtonStyle: CSSProperties = {
    color: "#3b82f6",
    textDecoration: "underline",
    background: "none",
    border: "none",
    cursor: "pointer",
};

const contentStyle: CSSProperties = {
    marginTop: "1rem",
};

export const Sidebar: FC<SidebarProps> = ({ onClose }) => (
    <div style={sidebarStyle}>
        <button style={closeButtonStyle} onClick={onClose}>
            Close Sidebar
        </button>
        <div style={contentStyle}>
            <p>Sidebar Content</p>
            <div style={{ height: "2000px" }} />
        </div>
    </div>
);
