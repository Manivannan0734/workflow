import axios from "axios";

 
const axiosInstance = axios.create({
  baseURL: "http://localhost:8000/api",
});

 
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

 
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
       
      localStorage.removeItem("token");
      window.location.href = "/Login";
    } else if (status === 500) {
       
      window.location.href = "/Gerror";
    }

    return Promise.reject(error);
  }
);
 
 

export default axiosInstance;
