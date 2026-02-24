// Simple health check endpoint for CLAWBAZAAR
// Returns status, timestamp, and version information

export interface HealthResponse {
  status: string;
  timestamp: number;
  version: string;
}

export const getHealthStatus = (): HealthResponse => {
  return {
    status: 'ok',
    timestamp: Date.now(),
    version: '1.0.0'
  };
};

// For Next.js compatibility (if migrating in the future)
export default function handler(req: any, res: any) {
  const healthData = getHealthStatus();
  res.status(200).json(healthData);
}

// For direct usage as a function
export { getHealthStatus as default };