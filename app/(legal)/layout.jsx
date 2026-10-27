import DocumentLayout from "../../components/DocumentLayout";
export const metadata = {"title": "Terms & privacy | Draftmango", "description": "Terms of service, privacy and company information for Draftmango, operated by DROPCIRCLE LTD."};
export default function Layout({children}) { return <DocumentLayout bodyProps={{"className": "public-theme document-page", "data-screen": "legal", "id": "top"}} styles={["/app-type.css", "/public-theme.css", "/legal.css"]}>{children}</DocumentLayout>; }
