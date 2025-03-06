import React from 'react'

export default function EmailInput() {
    return (
        <div className="flex flex-row items-center border border-border rounded-full px-2">
            <span className="text-xs text-text-muted border-r border-border pr-2">Missa inte nästa utskick</span>
            <input className="text-text outline-none px-2 py-1 text-sm" placeholder="Example@email.com" />
        </div>
    )
}
