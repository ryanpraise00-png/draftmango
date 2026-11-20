import DocumentLayout from "../../components/DocumentLayout";
import {publicStyles} from "../../components/framo-styles";
export const metadata={title:"Website templates | Draftmango",description:"Browse 100 designer-made website templates. Preview a design and make it your own with Draftmango."};
export default function Layout({children}){return <DocumentLayout bodyProps={{className:"dm-public",'data-screen':'templates'}} styles={publicStyles("/framo-theme.css")}>{children}</DocumentLayout>;}
