import React from 'react'
import { FaReddit } from "react-icons/fa6";

export default function Testimonials({ testimonials }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
                <div
                    key={index}
                    className="  p-6  flex flex-col justify-center items-center font-sans"
                >
                    <p className="text-text-muted text-center">
                        <span className="text-xl font-bold text-center">"</span> {" "}{testimonial.text}
                    </p>
                    <a className="flex flex-row items-center gap-2 hover:underline" noopener noreferrer target="_blank" href={testimonial.url}>
                        {testimonial.source === "Reddit" && <FaReddit className="text-text-muted" />}
                        <span className="text-xl font-semibold text-text font-serif">{testimonial.name}</span>
                        {/* <span>•</span>
                    <span>{dayjs(testimonial.date).format("MMM D, YYYY")}</span> */}
                    </a>
                </div>
            ))}
        </div>
    )
}
