import DocumentLayout from "../../components/DocumentLayout";
export const metadata = {"title": "About — Draftmango", "description": "Learn about Draftmango and its operator, DROPCIRCLE LTD."};
export default function Layout({children}) { return <DocumentLayout bodyProps={{"className": "public-theme document-page", "data-screen": "information", "id": "top"}} styles={["/app-type.css", "/public-theme.css", "/legal.css"]}>{children}</DocumentLayout>; }
