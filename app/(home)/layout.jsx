import DocumentLayout from "../../components/DocumentLayout";
export const metadata = {"title": "Draftmango — Big ideas start with a little draft.", "description": "Build and refine your website with Draftmango. Start with an idea, work with AI, and edit every detail in your workspace."};
export default function Layout({children}) { return <DocumentLayout bodyProps={{"className": "public-theme", "data-screen": "home"}} styles={["/styles.css", "/app-type.css", "/public-theme.css"]}>{children}</DocumentLayout>; }
