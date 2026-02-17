import axios from 'axios';

// NOTE: The backend API is reachable at port 8002.
const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002/api/v1',
});

export default api;
