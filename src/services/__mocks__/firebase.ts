// Mock Firebase for testing
export const auth = {} as any;
export const db = {} as any;
export const realtimeDb = {} as any;
export const storage = {} as any;

export const checkConnectionHealth = jest.fn().mockResolvedValue({
  firestore: true,
  realtimeDatabase: true,
  auth: true,
  storage: true,
  timestamp: new Date(),
});

const app = {} as any;
export default app;
