export default (req, res) => {
  const token = process.env.EVIDENCIA_API_TOKEN || '';
  if (!token) {
    res.status(500).json({ success: false, message: 'Token not configured' });
    return;
  }
  res.status(200).json({ success: true, token });
};
