import { Discussion } from "../types/discussion";
import { TestDataFactory } from "../utils/testDataFactory";

// Generate a sample discussion using the test factory
export const sampleDiscussion: Discussion = TestDataFactory.createTestDiscussion({
  title: "The Benefits of Remote Work",
  description: "A discussion about the advantages and disadvantages of remote work arrangements.",
});