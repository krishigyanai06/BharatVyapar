# PowerShell Push Notification Simulator Script for Bharat FPO Vyapar
param (
    [string]$Event = "ALL",
    [string]$DeviceId = "192.168.1.38:45635"
)

Write-Host "=========================================================================" -ForegroundColor Cyan
Write-Host "📱 BHARAT FPO VYAPAR - ADB PUSH NOTIFICATION SIMULATOR (Device: $DeviceId)" -ForegroundColor Cyan
Write-Host "=========================================================================`n" -ForegroundColor Cyan

$events = @{
    "MARKETPLACE_LISTING" = @{
        title = "🌾 New Commodity Listing Alert"
        body = "Shri Ram FPO posted 500 Quintal Sharbati Wheat at ₹2,200/Qtl."
        data = "{`"type`":`"MARKETPLACE_LISTING`",`"commodityId`":`"COMM_MOCK_9901`"}"
    }
    "BUYER_REQUIREMENT" = @{
        title = "📋 New Buyer Requirement Created"
        body = "Corporate Buyer requested 200 Qtl Yellow Mustard in Kota mandi."
        data = "{`"type`":`"BUYER_REQUIREMENT`",`"requirementId`":`"REQ_MOCK_5012`"}"
    }
    "NEW_QUOTATION" = @{
        title = "💼 New Seller Quotation Received"
        body = "Kisan Producer Co. submitted a quote of ₹5,400/Qtl for your Mustard requirement."
        data = "{`"type`":`"NEW_QUOTATION`",`"requirementId`":`"REQ_MOCK_5012`",`"quotationId`":`"QUOTE_MOCK_7044`"}"
    }
    "BIDDING_OFFER" = @{
        title = "🤝 Counter Offer Received"
        body = "Buyer sent a counter offer of ₹2,150/Qtl for your Wheat listing."
        data = "{`"type`":`"BIDDING_OFFER`",`"offerId`":`"OFFER_MOCK_3099`",`"commodityId`":`"COMM_MOCK_9901`"}"
    }
    "DEAL_DONE" = @{
        title = "🎉 Deal Finalized!"
        body = "Congratulations! Your deal for 500 Qtl Sharbati Wheat has been locked."
        data = "{`"type`":`"DEAL_DONE`",`"dealId`":`"DEAL_MOCK_8820`",`"offerId`":`"OFFER_MOCK_3099`"}"
    }
    "PO_SENT" = @{
        title = "📄 Purchase Order Issued"
        body = "Buyer has generated Purchase Order #PO_MOCK_1044 for Deal #DEAL_MOCK_8820."
        data = "{`"type`":`"PO_SENT`",`"dealId`":`"DEAL_MOCK_8820`",`"poId`":`"PO_MOCK_1044`"}"
    }
    "PO_STATUS_UPDATED" = @{
        title = "🚚 PO Status Update: DISPATCHED"
        body = "Seller updated Purchase Order #PO_MOCK_1044 status to DISPATCHED."
        data = "{`"type`":`"PO_STATUS_UPDATED`",`"poId`":`"PO_MOCK_1044`",`"dealId`":`"DEAL_MOCK_8820`",`"status`":`"DISPATCHED`"}"
    }
}

function Fire-PushNotification($eventName, $item) {
    Write-Host "🚀 Triggering Notification: [$eventName]" -ForegroundColor Yellow
    Write-Host "   Title: $($item.title)" -ForegroundColor Gray
    Write-Host "   Body:  $($item.body)" -ForegroundColor Gray

    # Send intent launch via ADB to trigger on device
    $cmd = "adb -s $DeviceId shell am start -n com.bharatfpovyapar/.MainActivity --es mockEventType `"$eventName`""
    Invoke-Expression $cmd | Out-Null

    Write-Host "   ✅ ADB Push Trigger Sent to App!`n" -ForegroundColor Green
}

if ($Event -eq "ALL") {
    foreach ($key in $events.Keys) {
        Fire-PushNotification $key $events[$key]
        Start-Sleep -Seconds 1
    }
} elseif ($events.ContainsKey($Event)) {
    Fire-PushNotification $Event $events[$Event]
} else {
    Write-Host "❌ Unknown event: $Event. Available events: MARKETPLACE_LISTING, BUYER_REQUIREMENT, NEW_QUOTATION, BIDDING_OFFER, DEAL_DONE, PO_SENT, PO_STATUS_UPDATED" -ForegroundColor Red
}

Write-Host "🎉 Push Simulation Command Sent!" -ForegroundColor Cyan
