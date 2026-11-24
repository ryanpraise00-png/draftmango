import DocumentLayout from "../../components/DocumentLayout";
import {publicStyles} from "../../components/framo-styles";
export const metadata = {"title": "Draftmango | Big ideas start with a little draft.", "description": "Build and refine your website with Draftmango. Start with an idea, work with AI, and edit every detail in your workspace."};
export default function Layout({children}) { return <DocumentLayout bodyProps={{"data-screen": "home", className:"composer-theme"}} styles={publicStyles("/homepage-composer.css", "/workspace-framo.css")}>{children}</DocumentLayout>; }
