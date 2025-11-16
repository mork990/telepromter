import Home from './pages/Home';
import Recording from './pages/Recording';
import Settings from './pages/Settings';
import Templates from './pages/Templates';
import Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Recording": Recording,
    "Settings": Settings,
    "Templates": Templates,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: Layout,
};