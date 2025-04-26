import { useState, CSSProperties } from "react";
import { useMediaQuery } from "react-responsive";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";

import { Header } from "../components/Header";
import { Sidebar, sidebarWidth } from "../components/Sidebar";
import { SortableTile } from "../components/SortableTile";
import { Discussion } from "../types/post";
import { sampleDiscussion as sampleDiscussion } from "../const/test_constant";

const container: CSSProperties = {
    minHeight: "100vh",
    overflowX: "auto",
    overflowY: "auto",
    
};

const row: CSSProperties = { display: "flex", width: "auto" };

const sidebar: CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    width: sidebarWidth,
    height: "100%",
    backgroundColor: "#fff",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    overflowY: "auto",
    zIndex: 10,
};

const baseMain: CSSProperties = {
    flex: "100vw",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
};

export const DiscussionPage = () => {
    const isDesktop = useMediaQuery({ minWidth: 768 });

    const [discussion, setDiscussion] = useState<Discussion>(sampleDiscussion
    );

    const [open, setOpen] = useState(false);

    const onDragEnd = (e: any) => {
        const { active, over } = e;
        if (over && active.id !== over.id) {
            const oldIdx = discussion.posts.findIndex(p => p.id === active.id);
            const newIdx = discussion.posts.findIndex(p => p.id === over.id);

            setDiscussion(prev => ({
                ...prev,
                posts: arrayMove(prev.posts, oldIdx, newIdx),
            }));
        }
    };

    const sortbaleTileStyle: CSSProperties = {
        position: "relative",
        display: "flex",
        alignItems: "center",
        flexDirection: "column", width: "100%", maxWidth: "100%"
    }

    const main: CSSProperties = {
        ...baseMain,
        // marginLeft: open ? "10rem" : 0,
        transform: open ? "translateX("+sidebarWidth+")" : "none",
    };

    return (
        <div style={container}>
            <div style={row}>
                {open && <div style={sidebar}><Sidebar onClose={() => setOpen(false)} /></div>}

                <div style={main}>
                    <Header onButtonClick={() => alert("仮アクション")} onIconClick={() => setOpen(true)} />

                    <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                        <SortableContext items={discussion.posts.map(post => post.id)} strategy={verticalListSortingStrategy}>
                            <div style={sortbaleTileStyle}>
                                {discussion.posts.map(p => <SortableTile key={p.id} post={p} />)}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>
            </div>
        </div>
    );
};
