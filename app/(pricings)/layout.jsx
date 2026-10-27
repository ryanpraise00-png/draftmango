import DocumentLayout from "../../components/DocumentLayout";
export const metadata = {"title": "Plans & pricing | Draftmango", "description": "Explore Draftmango’s Free, Basic and Pro plans. Compare AI credits, websites and custom domain options."};
export default function Layout({children}) { return <DocumentLayout bodyProps={{"className": "public-theme", "data-screen": "pricing"}} styles={["/styles.css", "/app-type.css", "/pricings.css", "/public-theme.css"]}>{children}</DocumentLayout>; }
