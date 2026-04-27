$base = "C:\Users\CHAMA COMPUTERS\.gemini\antigravity\brain\aced2351-fb32-4dc3-9fba-10adf03c167e"
$map = @{
    "2570" = "register"
    "2573" = "home"
    "2576" = "vehicle_detail"
    "2579" = "payment"
    "2586" = "my_bookings"
    "2589" = "owner_dashboard"
    "2596" = "owner_fleet"
    "2599" = "owner_reviews"
    "2606" = "owner_analytics"
    "2610" = "admin_dashboard"
    "2615" = "admin_report"
    "2618" = "add_vehicle"
    "2625" = "kyc_upload"
    "2628" = "profile"
    "2631" = "fleet_management"
    "2638" = "all_bookings"
    "2641" = "feedback_moderation"
    "2644" = "user_management"
}

foreach ($step in $map.Keys) {
    $name = $map[$step]
    $file = Join-Path $base ".system_generated\steps\$step\output.txt"
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $matches2 = [regex]::Matches($content, '"downloadUrl":"(https://lh3\.googleusercontent\.com/[^"]+)"')
        if ($matches2.Count -gt 0) {
            $url = $matches2[0].Groups[1].Value
            $out = Join-Path $base "${name}_screen.png"
            curl.exe -s -L -o $out $url
            Write-Output "OK: $name"
        } else {
            Write-Output "NO_URL: $name"
        }
    } else {
        Write-Output "NO_FILE: $name ($step)"
    }
}
