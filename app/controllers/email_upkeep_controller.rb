class EmailUpkeepController < ApplicationController
  skip_before_filter :verify_authenticity_token

  def index
    @body = JSON.parse(request.raw_post)

    case @body["Type"]
    when "SubscriptionConfirmation"
      handle_subscription_confirmation
    when "Notification"
      handle_notification
    else
      logger.info "Email upkeep unhandled @body: #{@body.inspect}"
      raise "Unhandled request"
    end

    render nothing: true, status: 204
  end

  private
  def handle_subscription_confirmation
    uri = URI.parse(@body["SubscribeURL"])
    response = Net::HTTP.get_response(uri)
    logger.info "requested SubscribeURL #{uri}"
  end

  def valid_topic_arns
    ENV.fetch("AWS_SNS_TOPIC_ARNS", String.new).split(",")
  end

  def check_necessary_input
    unless valid_topic_arns.include?(@body["TopicArn"])
      raise "Must come from valid AWS SNS queue"
    end
    raise "Must contain SNS Message" unless @body["Message"].present?
  end

  def handle_notification
    check_necessary_input

    SnsNotification.new(@body["Message"]).handle
  end

  class SnsNotification
    attr_accessor :message, :type, :sub_message

    def initialize(message)
      @message = message
      @type = message["notificationType"]
      @sub_message = message[type.downcase]
    end

    def handle
      emails.each { |email| update_matching_user(email) }
    end

    private
    def emails
      recipients = sub_message.fetch(recipients_key, [])

      recipients.inject([]) do |emails, recipient|
        emails << recipient["emailAddress"] if recipient["emailAddress"]
      end
    end

    def recipients_key
      type == "Bounce" ? "bouncedRecipients" : "complainedRecipients"
    end

    def update_matching_user(email)
      user = User.where(email: email).first

      if user
        user.update_attributes(email_is_disabled: true,
                               email_disabled_reason: reason)
      end
    end

    def reason
      type == "Complaint" ? sub_message["complaintFeedbackType"] : "bounce"
    end
  end
end
