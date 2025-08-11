import { FaCheck, FaXmark } from "react-icons/fa6";
import { useModal } from "../providers/ModalProvider";
import LogInModal from "../modals/logInModal";
import { Link } from "react-router"
import { useAuthContext } from "../providers/AuthProvider";
const API_URL = import.meta.env.VITE_API_URL;

export default function AccountCallToAction() {
    const { openModal } = useModal();
    const { user, isGuestUser, isPaidUser } = useAuthContext();

    const handleOpenModal = () => {
        openModal(<LogInModal isOnboarding={true} />);
    };

    const freeAccountList = [
        // "Veckovisa marknadssummeringar",
        <span>Tillgång till <span className="font-bold">marknadslägesskannern</span> </span>,
        <span><span className="font-bold">Veckosummeringar</span> & insikter </span>,
        <span><span className="font-bold">Personligt</span> anpassade summeringar <span className="bg-primary text-white text-xs px-2 py-1  ml-2">Kommer snart!</span></span>,
        <span>Välj dina nyhetsutskick <span className="bg-primary text-white text-xs px-2 py-1  ml-2">Kommer snart!</span></span >,
        "Ändra tema",
    ]

    const guestAccountList = [
        "Dagliga marknadsuppdateringar",
        "Gratis nyhetsbrev",
        "Ingen personaliserad upplevelse",
        "Inga veckosummeringar",
    ]



    return (
        <div className="flex flex-col  gap-8 w-full mx-auto ">
            {/* Heading */}
            <div className="w-full text-center mb-10">
                <h2 className="text-4xl font-serif font-bold">Få marknadsinsikter – på ditt sätt</h2>
                <p className="text-text-muted text-base mt-2">
                    Välj hur du vill ta del av omxsums marknadsuppdateringar.
                </p>
            </div>

            <div className="flex md:flex-row flex-col justify-center">

                {/* Create Account Card */}
                <div className="flex-1 flex flex-col items-center justify-between ">
                    <div className="w-fit px-12 p-8  border border-border bg-foreground text-text shadow-lg hover:shadow-xl transition-shadow ">
                        <span className="font-bold">Premium</span>
                        <h3 className="text-4xl font-serif font-bold mb-4 text-start ">{isPaidUser ? "Tack för ditt stöd!" : "49kr/mån"}</h3>
                        {!isPaidUser && <p className="text-text-muted text-base mb-6">
                            För dig som vill ha tillgång till alla funktioner och insikter.
                        </p>}
                        <ul className="flex flex-col list-disc list-inside space-y-3 text-base leading-relaxed mb-6">
                            {freeAccountList.map((item, idx) => {

                                return (
                                    <div className="inline-flex gap-2 items-center" key={idx}>
                                        <span className="inline-flex items-center  w-3 h-3 text-primary "><FaCheck /></span>
                                        <p className="text-text-muted italic font-sans" >
                                            {item}
                                        </p>
                                    </div>
                                )

                            })
                            }

                        </ul>
                        <div className="text-center my-4">
                            <div className="text-center my-4">
                                {isGuestUser ? (
                                    <button className="primary-btn px-4 py-1 w-full" onClick={handleOpenModal}>
                                        Uppgradera till premium
                                    </button>
                                ) : isPaidUser ? (
                                    <>
                                        <div className="text-sm font-sans text-secondary border py-2 border-secondary font-medium mb-2">
                                            Du har redan Premium ✨
                                        </div>
                                        <Link to="/settings" className="underline text-primary text-sm font-normal">Hantera prenumeration</Link>
                                    </>

                                ) : (
                                    <form action={API_URL + "/stripe/create-checkout-session"} method="POST">
                                        {/* Add a hidden field with the lookup_key of your Price */}
                                        <input type="hidden" name="lookup_key" value="OMXSUM_premium_test-ea67345" />
                                        <button id="checkout-and-portal-button" className="primary-btn w-full" type="submit">
                                            Uppgradera till premium
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
                {!isPaidUser &&
                    <><div className="inline-flex justify-center items-center italic text-text-muted py-8 px-4 md:py-0">Eller</div>
                        <div className="flex-1 pt-0  flex flex-col items-center justify-center text-center ">
                            <div className="w-fit">
                                <h3 className="text-2xl font-serif font-bold mb-6">Fortsätt som gäst</h3>
                                <ul className="flex flex-col list-disc list-inside text-text-muted space-y-3 text-base leading-relaxed mb-6 text-center">
                                    {guestAccountList.map((item, idx) => {
                                        if (idx >= 2) {
                                            return (
                                                <div className="inline-flex gap-2 items-center" key={idx}>
                                                    <span className="inline-flex items-center  w-3 h-3 text-secondary "><FaXmark /></span>
                                                    <p className="text-text-muted italic font-sans" >
                                                        {item}
                                                    </p>
                                                </div>
                                            )
                                        } else {
                                            return (
                                                <div className="inline-flex gap-2 items-center" key={idx}>
                                                    <span className="inline-flex items-center  w-3 h-3 text-primary "><FaCheck /></span>
                                                    <p className="text-text-muted italic font-sans" >
                                                        {item}
                                                    </p>
                                                </div>
                                            )
                                        }

                                    })
                                    }
                                </ul>
                            </div>
                        </div>
                    </>
                }
            </div>
        </div>
    );
}
