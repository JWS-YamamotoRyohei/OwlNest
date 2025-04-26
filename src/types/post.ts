export type Discussion = {
    id: string;
    posts: Post[];
    title: string;
    userId: string;
    userName: string;
};
export type Reference = {
    id: string;
    title: string;
    link: string;
}
export type Graph = {
    id: string;
    title: string;
    comment?: string;
}

export type Post = {
    id: string;
    stance: "pros" | "cons";
    text: string;
    graph: Graph[];
    userId: string;
    userName: string;
    title?: string;
    images?: string[];
    references?: string[];
}
