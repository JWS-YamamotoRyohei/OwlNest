import { FC, CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Post } from "../types/post";


type Props = { post:Post };

export const SortableTile: FC<Props> = ({ post }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: post.id });

    const style: CSSProperties = {
        border: "1px solid #e5e7eb",
        borderRadius: "0.2rem",
        boxShadow: "0 1px 2px rgba(0,0,0,.05)",
        padding: "0.25rem",
        marginBottom: "0.1rem",
        marginTop: "0.1rem",
        // marginLeft: "0.1rem",
        cursor: "grab",
        userSelect: "none",
        width: "100%",
        fontSize: "0.6rem",
        textIndent:"0.3rem",
        backgroundColor: post.stance === "pros" ? "#E0F7FA" : "#FFEBEE",
        transform: transform ? CSS.Transform.toString(transform) : undefined,
        transition,
    };

    return (
        <div ref={setNodeRef} {...attributes} {...listeners} style={style}>
            {post.text}
        </div>
    );
};


