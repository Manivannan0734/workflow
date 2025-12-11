 
import Layout from "./Layout"
import "../styles/globals.css";

import "@mdxeditor/editor/style.css";
function MyApp({ Component, pageProps, router }) {
  
  const noLayoutRoutes = ["/", "/login"];  

  const isNoLayout = noLayoutRoutes.includes(router.pathname);

  if (isNoLayout) {
     
    return <Component {...pageProps} />;
  }

   
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}

export default MyApp;
