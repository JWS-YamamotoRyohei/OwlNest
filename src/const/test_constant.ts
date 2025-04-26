import { Discussion } from "../types/post";

export const sampleDiscussion: Discussion =     {
        id: "post1",
        title: "The Benefits of Remote Work",
        userId: "user1",
        userName: "Alice",
        posts: [
            {
                id: "pc1",
                stance: "pros",
                text: "Remote work improves work-life balance by reducing commute times.",
                graph: [
                    {
                        id: "graph1",
                        title: "Commute Time Reduction",
                        comment: "Shows average time saved daily."
                    }
                ],
                userId: "user1",
                userName: "Alice",
                images: ["https://example.com/image1.png"],
                references: ["https://remote-work-benefits.com"]
            },
                        {
                id: "pc2",
                stance: "cons",
                text: "Remote work improves work-life balance by reducing commute times.",
                graph: [
                    {
                        id: "graph1",
                        title: "Commute Time Reduction",
                        comment: "Shows average time saved daily."
                    }
                ],
                userId: "user2",
                userName: "Bob",
                images: ["https://example.com/image1.png"],
                references: ["https://remote-work-benefits.com"]
            },
                                    {
                id: "pc3",
                stance: "pros",
                text: "Remote work improves work-life balance by reducing commute times.",
                graph: [
                    {
                        id: "graph1",
                        title: "Commute Time Reduction",
                        comment: "Shows average time saved daily."
                    }
                ],
                userId: "user1",
                userName: "Alice",
                images: ["https://example.com/image1.png"],
                references: ["https://remote-work-benefits.com"]
            },
        ]
    }