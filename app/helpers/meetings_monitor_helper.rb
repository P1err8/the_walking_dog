module MeetingsMonitorHelper
  def status_color(status)
    case status
    when 'proposed' then 'warning'
    when 'accepted' then 'info'
    when 'in_progress' then 'primary'
    when 'completed' then 'success'
    when 'cancelled' then 'secondary'
    else 'dark'
    end
  end
end
