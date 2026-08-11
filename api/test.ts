export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(200).json({
    success: true,
    message: 'API is working!',
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
}