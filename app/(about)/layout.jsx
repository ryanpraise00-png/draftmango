import DocumentLayout from "../../components/DocumentLayout";
import {publicStyles} from "../../components/framo-styles";
export const metadata = {"title": "About | Draftmango", "description": "Learn about Draftmango and its operator, DROPCIRCLE LTD."};
export default function Layout({children}) { return <DocumentLayout bodyProps={{"className": "public-theme document-page", "data-screen": "information", "id": "top"}} styles={publicStyles("/legal.css", "/framo-theme.css")}>{children}</DocumentLayout>; }
