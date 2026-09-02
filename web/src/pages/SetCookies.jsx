import { useSearchParams, useNavigate } from "react-router-dom";

export default function SetCookies() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const cookies = searchParams.get("cookies");
    const freshChatId = searchParams.get("freshChatId");

    console.log("setting cookies");

    const decodedCookies = JSON.parse(cookies);
    const cookieState = JSON.parse(
        localStorage.getItem("zot-cookie-state") || "{}"
    );

    for (const { name, value } of decodedCookies) {
        if (name.startsWith("_shibsession_")) {
            cookieState.shibsession_name = name;
            cookieState.shibsession_value = value;
        } else {
            cookieState[name] = value;
        }
    }

    localStorage.setItem("zot-cookie-state", JSON.stringify(cookieState));
    localStorage.setItem("zot-fresh-chatid", freshChatId);
    localStorage.setItem("zot-last-cookie-sync-time", Date.now());
    console.log("updated zot-cookie-state:", cookieState);

    setTimeout(() => {
            navigate("/");
    }, 1000);

    return <div>Saved! Redirecting in 1 second...</div>;
}