import { FaCheck, FaXmark } from "react-icons/fa6";

export default function AccountCallToAction() {
    const freeAccountList = [
        // "Veckovisa marknadssummeringar",
        <span>Tillgång till <span className="font-bold">marknadslägesskannern</span> </span>,
        "Hantera dina prenumerationer och inställningar",
        "Ändra tema",
        <span>Personligt anpassade nyhetsbrev <span className="bg-primary text-white text-xs px-2 py-1  ml-2">Kommer snart!</span></span>,
    ]

    const guestAccountList = [
        "Dagliga marknadsuppdateringar",
        "Gratis nyhetsbrev",
        "Ingen personaliserad upplevelse",
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
                        <h3 className="text-2xl font-serif font-bold mb-6 text-center">Skapa ett konto</h3>
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
                            <a
                                href="/signup"
                                className="primary-btn px-4 py-1 w-full"
                            >
                                Skapa ett konto gratis
                            </a>
                        </div>
                    </div>

                </div>
                <div className="inline-flex justify-center items-center italic text-text-muted">Eller</div>
                {/* Guest Card */}
                <div className="flex-1 pt-0  flex flex-col items-center justify-center text-center ">
                    <div className="w-fit">
                        <h3 className="text-2xl font-serif font-bold mb-6">Fortsätt som gäst</h3>
                        <ul className="flex flex-col list-disc list-inside text-text-muted space-y-3 text-base leading-relaxed mb-6">
                            {guestAccountList.map((item, idx) => {
                                if (idx === 2) {
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
            </div>
        </div>
    );
}
